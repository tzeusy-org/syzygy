I reviewed all nine items against snapshot `7268edcc` and the live beads tracker (read-only). Every item needs rework: none passes on both scope and recommendation. Three items rest on a false premise:

- **`p98-details-target`:** the repository's own browser test shows that keyboard users are not stranded at this target.
- **`pwb-walkthrough`:** the proposed merge freeze also freezes the generalized dossier code.
- **`arbitrary-public-repo`:** the deciding argument relies on an unsigned candidate (REQ-045), and the item leaves out two product requirements in the same change.

**Header and exclusion lists.** One open owner-decision bead appears neither as an item nor in any "not asked" list. `syzygy-bpyt.1.8` (keep or tighten how the consent gate recognizes an act) belongs with `consent-withdrawal-knobs`. `syzygy-bpyt.1.13` is also unlisted, but it is P4 and has to name its act first, so it is cosmetic. Minor: I count 764 non-merge commits since 2026-10-15, not 765. The other header claims check out: 471 greenfield-parity commits, `feat:` commits going from 86 to 5, the standing direction at lines 34-46 and 122-131, and the completion bar at `PROJECT-STATUS.md:76` and the understanding-amendment spec at line 422.

---

- Item: `second-project`
- Scope verdict: Revise — the target was already chosen on 2026-10-03, and preparing the offering is lead work under the standing direction. The one real owner act, performing the consent over bytes already cleared in round 7, is pushed to a later sitting, which adds an extra owner round-trip.
- Recommendation verdict: Revise — option A's cons leave out that the requests consent admits a single revision. Requests therefore cannot supply the "source-change regeneration" the completion bar requires without a consent successor. With Redis held (item 2), no project can supply it.
- Material corrections:
  1. [Observed] The consent table lists only `v2.34.2` → `6e83187b…` (`instances/requests/OBSERVATION-CONSENT.md`, revision table; `params.json` REVISION_TABLE). Redis has four commits. Disclose this, and add an option to offer the consent now (after the peeled-commit check) or to redraft it with a changed-source pair.
  2. [Observed] `syzygy-i5qt` marks "conflicts with nothing" as [Inferred]. It also says the wording "reads ambiguously as a limit on the owner's own session", and its disposition prescribes a second template "if a new target is admitted first". The packet quotes only the reassuring half.
  3. [Observed] Confirmed:
     - consent digest `d154165c…` matches the manifest row and `ROUND-7-DISPOSITIONS.md:26`;
     - screening scope v4 and the source-acquisition entry are repository-generic, so no third act is hidden;
     - the S12 fixture run is `syzygy-qkea.13`, still open.
  4. [Inferred] The "Shortest lawful path" pro holds only if the run route (one-command prototype or `dossier init`) is settled. State which route is assumed.
- Evidence freshness: `7268edcc`; beads `syzygy-i5qt`, `syzygy-mea`, `syzygy-qkea.13` read live on 2026-11-03. Not inspected: upstream requests refs and the peeled commit.

---

- Item: `redis-next-step`
- Scope verdict: Pass — option A (a new attended trial) is a genuine owner gate. One citation is wrong: `PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md:22-24` is the supersession text; the four commits are in `instances/redis/OBSERVATION-CONSENT.md:21-28`. Option A should also say which run route the trial uses (the one-command launch, or operator-started `dossier init`).
- Recommendation verdict: Revise — option B is misdescribed on both cost and benefit.
- Material corrections:
  1. [Observed] The in-force Redis provider statement v2 already lists `governance-text` (`dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md:26`). B therefore needs a policy classification rule, not "new policy and consent acts".
  2. [Observed] Per `SEMANTIC-DELTA.md:287-293`, a `governance-text` rule reaches only `SECURITY.md` and `MANIFESTO`. `TLS.md` (a project-specific topic name), `redis.conf` (would need a code-content extension) and `modules/MODULES.md` (a nested path rule) were each declined for other reasons, and the 10 active-content spans are "not offered". "Attacks the real blocker" overclaims.
  3. Option C depends entirely on `second-project` going ahead. Say what happens to Redis if the owner rejects or delays item 1.
  4. [Observed] Confirmed: 140 of 233 spans withheld; the 24-hour-deadline refusal at `redis-screening-v4-remeasure-2026-10-21.json:156-166`; `syzygy-1z8m`'s 2026-11-02 note lists the "owner attended Redis trial" as remaining.
- Evidence freshness: `7268edcc`; beads read live. Not inspected: the Redis run directory under `/home/tze` and the live CLI.

---

- Item: `arbitrary-public-repo`
- Scope verdict: Revise — the change also carries REQ-038 (reconstructed motivations) and REQ-039 (external comparisons) (`proposed/polaris-generation/spec.md:180,277`), and the owner directed item 2 explicitly (`ARBITRARY-PUBLIC-REPO-DOSSIER-DIRECTION.md`, "Motivations may be reconstructed"). Under option C ("park the doctrine amendment") their fate is unstated. Options A and C are also not clearly distinct: the owner already chose "One question per target, at manifest rows" on 2026-10-03 (Q5). C has to say what it removes beyond today, namely the per-repository code change and review round.
- Recommendation verdict: Revise — the deciding rationale, "REQ-045 would keep a per-repository act even under B", rests on an unsigned candidate that the header itself lists as not yet askable. The drafted change itself says a per-repository provider statement is needed only for a governed tree (`design.md:162-166`). That follows adopted REQ-033, which applies only to "a governed subject" or one whose drawer is undetermined (`design.md:32`). So under B an ungoverned repository on the `init` path would need no per-repository act.
- Material corrections:
  1. State whether C splits REQ-038/039 out to proceed separately.
  2. Present REQ-045 as an open candidate that the owner can shape, not as a fixed constraint.
  3. Add an option: split the change, with the admission route via template or standing permission and REQ-038/039 as their own change.
- Evidence freshness: `7268edcc`. Not inspected: PRs #400 and #477.

---

- Item: `p98-details-target`
- Scope verdict: Revise — the premise is contradicted by the repository's own tests. `apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:373-408` follows the exact-requirement row by keyboard and asserts `onTarget: true, open: true, tabContinued: true`, with the comment "Chrome opens the disclosure on fragment navigation and focuses the link, and Tab continues from it". `syzygy-u05.25` (d) records the same result as "(tested)", and `polaris-first-reading.test.ts:290-298` explains the narrowing. The stranding in the AGENTS.md guardrail does not occur for this focusable target. What is genuinely left for the owner:
  - the visible legend heading the signed text lacks (`syzygy-mozi` item 1);
  - possibly `u05.25` (c), the fragment-load first-load state, which the bead calls "owner-facing" and which the packet omits.
- Recommendation verdict: Revise — option B's con ("Known accessibility defect") and the recommendation's "the defect is observed" are false for this target. Better options:
  - let the signed target stand, record the tested behaviour, and either amend only for the legend heading or remove the heading and change the oracle's recognizer (lead work);
  - fold `u05.25` (c) into any amendment.
  The [Inferred] claim that walkthrough prompt 5 "passes through this target" is weak: prompt 5 asks the reader to reach any verbatim requirement (`OWNER-WALKTHROUGH-PACKET.md:47`). The "prerequisite of `pwb-walkthrough`" link falls with it.
- Material corrections: drop the defect claim; reframe the item around the heading deviation (and (c)); remove the prerequisite edge or mark it [Inferred]. The item is still Draft with its review Pending.
- Evidence freshness: `7268edcc`; beads `syzygy-mozi`, `syzygy-u05.23`, `syzygy-u05.25` read live. Not inspected: a live browser run.

---

- Item: `pwb-walkthrough`
- Scope verdict: Revise — the freeze is much wider than described. [Observed] `POLARIS_SURFACE_TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']` (`walkthrough-inputs.ts:79`). That is the whole POC app, 194 tracked files under the app's `src`, 49 of them in the dossier/generation code, including `polaris-generation/public-source-screening.ts`. Any commit there changes the surface version, test-only commits included. So "Holds four lanes" is understated: the freeze also blocks the product path (items 1 and 2). Other errors:
  - wrong path: `walkthrough-judgment.ts` is in `packages/three-surface-poc-core/src/` (the check is at line 527 there);
  - "110 commits" counts merge commits (62 non-merge);
  - `tasks.md` also leaves 5.2 unchecked;
  - the `p98-details-target` prerequisite is weak (see above).
- Recommendation verdict: Revise — option A contradicts the packet's own rationale for `pwb-release-label` ("Butlers surface is off the main product path") and the owner's 2026-10-14 priority on useful product. Missing options:
  - schedule the window after the requests run lands;
  - [Inferred] narrow the surface-version binding to the Polaris render inputs. PWB spec line 2399 says only "one exact surface version" and does not fix the tree scope.
  Option C should note that `syzygy-1z3.25`'s acceptance criteria forbid calling the cycle complete "while 4.6 lacks a valid recorded judgment", so C needs an explicit owner waiver.
- Material corrections: disclose the real freeze scope, add the two options, fix the path, and drop or soften the p98 dependency.
- Evidence freshness: `7268edcc`; beads `syzygy-1z3.22`, `syzygy-1z3.25` read live. Not inspected: the Butlers checkout and the live daemon.

---

- Item: `pwb-release-label`
- Scope verdict: Pass — keep, park or decline for a feature the owner asked for is a feature-scope owner gate. Cosmetic issues:
  - "[Observed] further repair rounds are the lead's choice" is the lead's [Inferred] reading. The stopping rule says "no further round is dispatched without a new owner direction" (`OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`), and cycle 6 relied on the autonomy direction.
  - The packet citation `:237-300` misses Q6 (line 304).
- Recommendation verdict: Revise — "eight rounds have not converged" misstates the trajectory. Per register row P-85, round 8 "confirmed every round-7 repair" and left one wording finding whose reviewer-supplied fix "changes no check". B's real remaining cost is one wording repair, one round, a Q1–Q6 sitting, a registry-entry package for Q2 (which also patches the entry P-112 touches), and implementation. The pros and cons should say exactly that. [Unknown] Whether the general dossier already shows a tag label (public consents pin tags as labels). If it does, A's "carry the idea" pro is weaker.
- Material corrections: restate the convergence trajectory and B's concrete cost; relabel the lead-choice claim as [Inferred].
- Evidence freshness: `7268edcc`. Not inspected: the original 2026-10-02 session.

---

- Item: `consent-withdrawal-knobs`
- Scope verdict: Revise — it overlaps with an open owner decision it does not mention. `syzygy-bpyt.1.8` records [Observed by the lane] that a field-parsed act record "still counts with … a withdrawal appended". That is the same "withdrawal defeats grant" hole in the same gate, and it is neither asked nor excluded. Two other problems:
  - The knob-1 cite `PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md:101` is that direction's own self-withdrawal clause, not a consent-gate rule.
  - "Effect of knob 4 … Unknown" is partly determinable now. [Observed] The only admission act record (`PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`) has one `Supersession` line, so refusing a repeated one refuses nothing today.
- Recommendation verdict: Revise — "Closes every shown hole" is false. `act-families.test.ts` already pins further worlds that read `ok`, for example "an admission stem split by backticks in text" → `ok` for three families while the registry family refuses its equivalent (knob 6, around lines 218-221). Option C's con, "no shown hole for four", is therefore wrong too. Missing option: a rule-based alignment ("align every knob toward refusal wherever a family accepts a world another refuses; stop if any in-force record reads differently"), coordinated with `bpyt.1.8`.
- Material corrections: fold in or explicitly sequence `bpyt.1.8`; correct the shown-hole population; fix the authority cite; resolve knob 4's repeated-supersession half.
- Verified: [Observed] 0 blockquoted field lines across 188 files under `decisions/`, so the knob-1 "refuses nothing today" claim holds. Review raw lines 307-313 and `package-reader.ts:638-650` match the packet.
- Evidence freshness: `7268edcc`; beads `syzygy-bpyt.1.12`, `syzygy-bpyt.1.8` read live. vitest not run.

---

- Item: `wire-unknown-typing`
- Scope verdict: Revise — `syzygy-bpyt.1.23` covers seven prose-only arms and two mixed fields (precedence/rootSummary `unknown.reason`, and `NO_SEED_SET_CURRENT_AUTHORITY_REASON`). The boundary ("prose-only Unknown arms … prose reason strings unchanged") silently drops the two mixed fields, which also break RFC6-14's verbatim rule. [Inferred] Since RFC2-24/RFC6-14 already require the reason, the "whether" is answered by contracts. The owner gate is only the wire-format change, which GP-Q0 part 1 counts as non-behaviour-preserving; that framing is defensible.
- Recommendation verdict: Revise — "brings the endpoint into line with RFC2-24" overclaims while the mixed fields stay. State their disposition, either in scope or as a disclosed remainder. The sequencing after `syzygy-1poh` is sound, but 1poh is BLOCKED behind `bpyt.6.3`/`bpyt.16`. Name that as the unblock condition.
- Material corrections: include or explicitly exclude the two mixed fields.
- Verified: [Observed] the RFC2-24 cite (`contracts/rfcs/RFC-0002/rendering-vocabularies.md:103-125`), the POC spec line 465 `closedReason`, and `closedReason` already present in code (`trajectory.ts`, `orrery.ts`, `polaris.ts`).
- Evidence freshness: `7268edcc`. Not inspected: live `/api/poc` bytes.

---

- Item: `foundational-acts`
- Scope verdict: Pass — the acts are owner-only, and a knowing hold is legitimate at P4. Verified:
  - [Observed] `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md:59-62` = rows 2-5;
  - the overview digest `83658e3b…` and topology manifest digest `f1cf0407…` match the current bytes;
  - both restyle raws are scoped as described.
  Cosmetic: the deferred waves C1/C2/D1/D2 are not mentioned. They are covered by `DEFERRED-WAVE-POSTURE.md`.
- Recommendation verdict: Revise — "no current work depends on them" is false for P-12. [Observed] Running `check_governance.py` on the snapshot gives 32 OK, 21 WARN, 0 FAIL. CG-20 and CG-21 are "advisory until the knowledge-hygiene policy is adopted", and CG-27 is "advisory until P-12 is ruled". Those are the stale-claim checks that AGENTS.md lessons were paid for. Missing option: commission only P-12's confirming review and hold acts 2–5.
- Material corrections: disclose P-12's checker consumer; add the P-12-only option.
- Evidence freshness: `7268edcc`; checker run in the snapshot, which remained clean.

---

No files were edited and nothing live was changed.