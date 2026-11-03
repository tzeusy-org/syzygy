I reviewed all six items. None passes as drafted: five need revision on both verdicts. `pwb-pin-structure` also needs its scope revised, and its recommendation needs only the costs added. Everything below was checked read-only against the snapshot `7268edcc` and the live Beads tracker. I edited nothing.

---

- **Item: `pwb-pin-structure`**
- **Scope verdict: Revise.** The main facts are right. But writing a candidate package is something the lead may already do without asking: bead `syzygy-2g0d` is labelled `self-drivable`, and the 2026-10-15 standing direction (`OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md:124-129`) leaves only binding acts to the owner. The real owner choices are narrower: whether to stop redrafting P-95, and which pin form to sign later. The item also covers only PWB, although Polaris registry entries use the same field.
- **Recommendation verdict: Pass.** The recommendation can stand once its costs are stated. The structural fix needs both digest acts, direction C and a gate re-point at least once, so the pro "ends the recurring two-act cost" leaves out that one-time cost, which equals one re-pin. A missing option is to fold the re-pin into the next act that touches each file anyway: P-112 and P-85 Q2 for the registry entry, a v5 policy act for the policy. A further option is to drop the field.
- **Material corrections:**
  1. **[Observed]** The installed `declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json:51-54` already uses a lineage-style pin ("the generation specification bytes in force at the signing commit"). That is a precedent the item should cite.
  2. **[Inferred]** A floating lineage pin carries a cost the item omits: it lets an act's approval extend silently over specification bytes the owner never re-approved for that artifact, and R6 could no longer detect the drift. Folding the pin into each PWB sign-off keeps that explicit.
  3. **[Observed]** The 2026-10-20 acts that superseded both pinned artifacts (the screening-v4 policy act and the machine-ceiling registry act) carried the stale pin forward unchanged. A chance to re-pin at no extra act cost was missed, which supports the fold-in option.
  4. "P-95 is void" is the author's inference: register row P-95 carries no void mark. The policy subject was first superseded around 2026-10-07/08 (the Redis sitting, per the `syzygy-2g0d` comment), not on 2026-10-20.
  5. **[Observed]** `check_spec_reconciliation.py` sets `PIN_BEAD` to `syzygy-2g0d`, which is closed. The open bead is `syzygy-fxro`.
  6. **[Observed]** PWB `spec.md` has not changed since `f6a98517` (2026-10-15), so whether it keeps going stale depends on future PWB amendments. If `next-focus` A is chosen, option C becomes stronger.
- **Verified:** R6 run with `--check` reports 2 findings: both files pin `0d50f8f4…` while the current spec is `44f4ad77…`. Nothing in `apps/` or `packages/` reads `governingBehaviorContract`; `governance-inputs.ts:57` is a comment. P-95 packet lines 215-221 match. No accepted RFC or spec defines the field (0 hits), so no contract amendment is needed.
- **Evidence freshness:** `7268edcc`; `bd show syzygy-fxro/2g0d` read on 2026-11-03. No live daemon run.

---

- **Item: `pwb-release-label`**
- **Scope verdict: Revise.**
  - Under the standing autonomy direction, a further repair-and-review cycle is a process choice the lead may make. The lead already decided cycle 6 that way (register row P-85, "Marked 2026-10-20, cycle 6"), and the round-8 brief says "no round 9 … without a new owner **or lead** instruction" (`ROUND-8-DISPOSITIONS.md`).
  - The owner-level questions are whether to keep, park or decline the feature the owner asked for, plus Q1 and Q2.
  - **[Observed]** Packet Q3 is stale. Its recommended option "Fold it into P-84's revision" points at P-84, which was parked on 2026-10-14. Its narrower successor P-108 was signed on 2026-10-15 with the subject identity deferred. Offering "Q1–Q6 in one sitting" would offer a stale Q3.
- **Recommendation verdict: Revise.**
  - **Auto-park and the stopping rule:** auto-park fits the in-force rule (`CONFIRMATION-CYCLE-2-2026-10-14.md:35-37`) only as a new owner direction that settles the REVISE in advance. It must say that the REVISE is still recorded in the register with its findings open. It must also say that it binds the lead: no cycle 10 under the autonomy direction, which is how cycles 6 to 8 happened. The item says neither.
  - **"Wording fix":** accurate. Round 8 has 1 revise finding and 3 notes; the reviewer's repair, "outside the excepted elements", changes no check (raw lines 4, 80 and 94). But 0 of 8 rounds have cleared, and each repair retires the earlier confirmation.
  - **Missing option:** the owner may sign the round-8 bytes with F1 disclosed. The overclaim is in the scenario's THEN, and the checks are correct.
  - **Missing option:** move the label to the generalized Polaris generator (public repositories). That is the product path `next-focus` recommends, while the PWB/Butlers surface is off it.
  - **Bundling risk:** drafting the registry amendment in advance assumes Q2's recommended answer, while the packet claims "Q1–Q6 are not answered". That registry package needs its own review cycle, and it patches the same registry entry as P-112, so whichever act lands second must be regenerated.
  - **Note:** "it needs a separate registry amendment" is overstated. Q2's "Admit nothing" option ships the label in its not-read form.
- **Material corrections:** Q3 is stale (P-84 parked, P-108 signed). Auto-park must bind the lead's autonomy. The cycle decision is the lead's to make. Add the "sign over F1" and "move to generalized Polaris" options. Drop or flag the registry pre-draft as answering Q2 in advance.
- **Verified:** eight raws, R1–R8, all with `Verdict: REVISE` on line 4. Round 8 was reviewed at `00bbd035` on 2026-10-20. Packet Q2 is at lines 245-257.
- **Evidence freshness:** `7268edcc`; `bd show syzygy-l362` read. I did not inspect the original lead-session answer of 2026-10-02.

---

- **Item: `consent-withdrawal-knob`**
- **Scope verdict: Revise.** This is a real owner gate: the GP-Q0 part 3 stop clause (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:95-96`) covers any change to what a gate refuses. But the hole is described imprecisely, and one claim is wrong:
  1. **[Observed]** The rule "withdrawal defeats grant" is cited to AGENTS.md, which says it is never citable as authority. Cite `PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md:101` or the continuation act at `:163`.
  2. **[Observed]** The hole is narrower than "a blockquoted withdrawal". In `package-reader.ts:638-650` the policy sweep matches the `public-source-scope` stem in the full text of every file except `ACCEPTANCE-ACT-RECORD.md`, quoted lines included. A blockquoted naming slips through only (a) by act identity inside the aggregate record, or (b) by the policy *path* on a blockquoted `Artifact identity:` line in any file. The reviewer's world and `act-families.test.ts:213` both sit in the aggregate record.
  3. **[Observed, wrong claim]** "[Unknown] … no reviewer has shown one" for knobs 2–7 is contradicted. N9's heading says "fail-open asymmetries" (plural) and shows two more worlds that read `ok` in both trees: `admission-supersession-dup` (knob 4) and `class-recorder-lines-gone` (knob 5) (`R-GP-IMPL-ACT-FAMILIES-1-RAW.md:307-313`). The bead's own title says "some of which are fail-open".
- **Recommendation verdict: Revise.**
  - **Missing middle option:** align the three knobs the reviewer showed (1, 4 and 5).
  - **Do before asking:** a falsifier sweep of knobs 2–7 is ungated agent work that would turn the Unknown into evidence before the owner is asked.
  - **Would aligning knob 1 refuse an in-force record?** Not today. **[Observed]** Over all 188 files under `decisions/`, no line is a blockquoted `Artifact identity` or `Act identity` field naming the policy. A second check, a `grep -E` for any blockquoted identity line, also found 0. The decisions tree contains no withdrawal file. So the "stop and return" condition would not fire on the current tree.
  - **Unresolved check:** the item should state why GP-Q0 part 2's row "How the consent gate recognizes an act: Kept as is" does not cover the withdrawal sweep. **[Inferred]** It is about template recognition, not the sweep, but the packet should say so.
- **Material corrections:** fix the authority citation; state the hole precisely (aggregate record by identity, or the path on any blockquoted line); correct the knob 4/5 Unknown; add the "1, 4, 5" option; add the zero-impact sweep result.
- **Evidence freshness:** `7268edcc`; `bd show syzygy-bpyt.1.12` read. I did not run the vitest suite.

---

- **Item: `wire-unknown-typing`**
- **Scope verdict: Revise.**
  - **[Observed]** The item frames this as an optional improvement, but it looks like a conformance gap. POC-REQ-003 and the work-items requirement list RFC2-24 among their contracts (spec lines 209 and 435). RFC2-24 requires one primary reason from a closed list of twelve, and RFC6-14 requires the machine answer to carry that reason verbatim (`RFC-0002/rendering-vocabularies.md:103-125`; `RFC-0006…:279-285`). Option C is therefore "keep a known gap against the warrants", not "no change".
  - **[Observed]** The exclusion "no wire change until the governing POC spec amendment is signed" assumes an amendment is needed. I found no POC clause that closes these arms' field set; POC-REQ-003 only requires a non-empty reason naming the failure class. GP-Q0 part 3 shows that a wire or refusal change can be approved by plain owner direction. Spec amendment versus direction should be an option, not an assumption; the amendment route costs a CC-REV-2 package and review rounds.
- **Recommendation verdict: Revise.**
  - **[Observed]** Reuse what exists. The wire already uses `closedReason` (the POC-REQ-014 machine-wire contract, spec line 465), and the code already has an `UnknownReason` type. A new `reasonCode` name would duplicate both.
  - B's con "breaking change for readers" is overstated. Every consumer is owned and the POC is not released; P115 migrates its consumers in one change. B's real cost is changing the `reason` string that POC-REQ-003's checks compare.
  - "After P115 lands" depends on `syzygy-1poh`, which is BLOCKED, so the item needs a concrete unblock condition.
  - **[Inferred]** The count of seven arms comes from the bead. Other string-typed Unknown arms exist in core: `resource-headroom.ts:34`, `resource-ledger.ts:100`, `reevaluation.ts:50` and `project-shape-coverage.ts:290,295`. Before quoting "seven", the full set of arms in the served payload should be listed (verification rule 9).
- **Material corrections:** reframe as an RFC2-24/RFC6-14 conformance gap; offer spec amendment versus plain direction; use `closedReason` and the RFC2-24 values; re-derive the arm count from the served payload.
- **Evidence freshness:** `7268edcc`; `bd show syzygy-bpyt.1.23/1poh` read. I did not inspect live `/api/poc` bytes.

---

- **Item: `exact-source-render-mode`**
- **Scope verdict: Revise.**
  - **[Observed]** The owner did more than leave it unselected. The owner confirmed an explicit exclusion: "Explicit exclusions: … exact-source render-mode", confirmed on 2026-10-21 through the questionnaire web form (`OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-20.md:32-35, 337-338`; `…-CONFIRMATION-NOTES.md:58`).
  - Asking again 13 days later, with nothing new stated, conflicts with the packet's own "not asked because already answered" rule. The item should say what has changed, or be dropped.
- **Recommendation verdict: Revise.**
  - **[Observed]** "Readers reach exact source for every item" overclaims. The act keeps the 9 withheld sources unserved and leaves the 269-of-278 figure to be measured (`PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md:44-56, 87-95`).
  - "Queuing it last costs nothing" is wrong. Every other dependency of `syzygy-dov.14.3` is closed, so authorizing makes it immediately ready work for coordinators. It also carries an unmeasured page-size and response-ceiling effect that the act defers.
  - It is off the generalized-Polaris path that `next-focus` A recommends. Given two deliberate exclusions, B (keep holding), or holding until the cold-open walkthrough shows a reader need, is better supported.
  - The scope "no new content class, read or egress" matches the act [Observed].
- **Material corrections:** cite the confirmed explicit exclusion; fix "every item"; drop the "costs nothing" claim; reconsider B as the recommendation.
- **Evidence freshness:** `7268edcc`; `bd show syzygy-m5vt/dov.14.3` read.

---

- **Item: `foundational-acts`**
- **Scope verdict: Revise.** A knowing hold is a legitimate, honest register entry; P-10 is a precedent. But two background claims are wrong:
  1. **[Observed]** "Acts 2 and 4 have none at their current digest" misleads for act 2. `testing-and-verification.md` last changed at `073295da`, in the craft restyle, and its sha256 `8157c0c6…` equals the act-2 argument. That restyle chain ended with `R-TREE-STYLE-CRAFT-4-RAW.md` "CONFIRM WITH EXCEPTIONS", which `CRAFT-TREE-RESTYLE.md` says "clears the bytes". This is the same kind of clearance act 3 has. That raw does not quote the digest, which matches the AGENTS.md lesson that zero digest citers does not mean never reviewed.
  2. **[Observed]** Act 3's "CONFIRM WITH EXCEPTIONS review at its digest" (`R-TREE-STYLE-TOPOLOGY-2-RAW.md:2,19`) only checks that the restyle preserves meaning. Substantive reviews 5–7 saw the earlier bytes (`TOPOLOGY-TREE-RESTYLE.md:25,82`), so "already cleared" overstates.
  3. **[Observed]** "The 2026-08-31 interpretation act already lets bounded missions operate" overstates. The act approves, starts or resumes no mission and accepts no part of RFC 0010 (`BOUNDED-MISSION-DOCTRINE-INTERPRETATION-ACT.md` Boundary). AGENTS.md also forbids Mission Control. Say instead that it settles the doctrine question D3 addresses, so act 5 is on no current path.
  4. P-12 (knowledge hygiene) is the ninth open foundational offering (`PROJECT-STATUS.md:279-281`) and is not mentioned. Include it in the hold or say why not.
- **Recommendation verdict: Revise.** A is defensible: I found no consumer in `apps/` or `packages/`, only one test fixture string, so the [Inferred] "nothing depends on them" holds. But option B is misframed. If clearing is the criterion, it should be "offer acts 2 and 3". Its con "little effect" ignores that accepting the topology turns intended placement into authority and may trigger CC-IMPACT propagation duties [Inferred].
- **Verified:** current hashes equal the offered arguments: act 2 `8157c0c6…`, act 3 `f1cf0407…` (BUNDLE-MANIFEST), act 4 `83658e3b…` (OVERVIEW). No review raw cites act 4's digest. OVERVIEW (`ec3852a1`, 2026-09-27) predates D9 (2026-10-06) and D8 (2026-10-15/20). The P-5 row confirms that a D3 rev2 and a fresh-reader review must come first.
- **Evidence freshness:** `7268edcc`.

---

**Shared freshness note:** everything above is from the snapshot `7268edcc` (2026-11-03 02:29 UTC) and `bd show`/`bd comments` read on 2026-11-03. Not inspected: GitHub PR state, any live daemon or `/api/poc` bytes, `/home/tze/` (including `.syzygy/local/` questionnaires), the Butlers checkout, and the original lead-session owner transcripts.